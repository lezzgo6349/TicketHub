(function () {
    var GUEST_KEY = "ticketHistory_Guest";

    var CHECKOUT_SESSION_PREFIX = "ticketHubCheckout_";
    var AUTH_SESSION_USER_ID_KEY = "ticketHubAuth_userId";

    function sanitizeKeyPart(str) {
        return String(str).replace(/[^a-zA-Z0-9_]/g, "_");
    }

    /** Registered user by id; username-only accounts (legacy); guest bucket. */
    function historyStorageKeyForUser(user) {
        if (!user) {
            return GUEST_KEY;
        }
        if (user.id != null) {
            return "ticketHistory_uid_" + String(user.id);
        }
        if (user.username) {
            return "ticketHistory_uname_" + sanitizeKeyPart(user.username);
        }
        return GUEST_KEY;
    }

    /** Legacy key used before per-id storage (username only — caused collisions). */
    function legacyHistoryKeyForUser(user) {
        if (!user || !user.username) return null;
        return "ticketHistory_" + user.username;
    }

    function loadRaw(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveRaw(key, list) {
        localStorage.setItem(key, JSON.stringify(list));
    }

    /**
     * @param {object|null} user - from ticketUsers / loggedInUser, or null for Guest
     */
    function getHistoryForUser(user) {
        if (!user) {
            return loadRaw(GUEST_KEY);
        }
        var uidKey = historyStorageKeyForUser(user);
        var data = loadRaw(uidKey);
        if (data.length) {
            return data;
        }
        var leg = legacyHistoryKeyForUser(user);
        if (leg) {
            var old = loadRaw(leg);
            if (old.length) {
                saveRaw(uidKey, old);
                localStorage.removeItem(leg);
                return old;
            }
        }
        return [];
    }

    function saveHistoryForUser(user, list) {
        saveRaw(historyStorageKeyForUser(user), list);
    }

    function ownerIdForUser(user) {
        if (!user || user.id == null) return "guest";
        return String(user.id);
    }

    /**
     * Update exactly one transaction for that account (matches id + owner).
     */
    function updateHistoryItemForUser(user, transactionId, updates) {
        var list = getHistoryForUser(user);
        var idStr = String(transactionId);
        var expectOwner = ownerIdForUser(user);
        var next = list.map(function (item) {
            if (String(item.id) !== idStr) return item;
            var itemOwner = item.ownerUserId != null ? String(item.ownerUserId) : null;
            if (itemOwner != null && itemOwner !== expectOwner) {
                return item;
            }
            return Object.assign({}, item, updates);
        });
        saveHistoryForUser(user, next);
        return next;
    }

    function getAllPendingTransactions() {
        var out = [];
        var users = JSON.parse(localStorage.getItem("ticketUsers")) || [];
        users.forEach(function (u) {
            getHistoryForUser(u).forEach(function (item) {
                if (item.status === "pending") {
                    out.push({
                        transaction: item,
                        user: u
                    });
                }
            });
        });
        getHistoryForUser(null).forEach(function (item) {
            if (item.status === "pending") {
                out.push({
                    transaction: item,
                    user: null
                });
            }
        });
        return out;
    }

    function countHistoryByStatusForUser(user) {
        var hist = getHistoryForUser(user);
        var pending = 0;
        var approved = 0;
        var rejected = 0;
        hist.forEach(function (item) {
            var s = item.status || "approved";
            if (s === "pending") pending++;
            else if (s === "approved") approved++;
            else if (s === "rejected") rejected++;
        });
        return { pending: pending, approved: approved, rejected: rejected };
    }

    function countUnreadHistoryForUser(user) {
        var hist = getHistoryForUser(user);
        var n = 0;
        hist.forEach(function (item) {
            if (item.historyNotify) n++;
        });
        return n;
    }

    function markHistoryNotifiedForUser(user) {
        var list = getHistoryForUser(user);
        var changed = false;
        var next = list.map(function (item) {
            if (!item.historyNotify) return item;
            changed = true;
            var o = Object.assign({}, item);
            o.historyNotify = false;
            return o;
        });
        if (changed) {
            saveHistoryForUser(user, next);
        }
    }

    function reservedKey(concertId) {
        return "reservedSeats_" + concertId;
    }

    function getReserved(concertId) {
        try {
            return JSON.parse(localStorage.getItem(reservedKey(concertId))) || [];
        } catch (e) {
            return [];
        }
    }

    function setReserved(concertId, keys) {
        localStorage.setItem(reservedKey(concertId), JSON.stringify(keys));
    }

    function reserveSeats(concertId, seatKeys) {
        var set = new Set(getReserved(concertId));
        seatKeys.forEach(function (k) {
            set.add(k);
        });
        setReserved(concertId, Array.from(set));
    }

    function releaseSeats(concertId, seatKeys) {
        var set = new Set(getReserved(concertId));
        seatKeys.forEach(function (k) {
            set.delete(k);
        });
        setReserved(concertId, Array.from(set));
    }

    function getLoggedInUserFromStorage() {
        // Per-tab session: only store userId in sessionStorage (prevents cross-tab takeover).
        // Legacy: some pages stored full user object in localStorage.loggedInUser (shared across tabs).
        var users = [];
        try {
            users = JSON.parse(localStorage.getItem("ticketUsers")) || [];
        } catch (e0) {
            users = [];
        }

        var sid = null;
        try {
            sid = sessionStorage.getItem(AUTH_SESSION_USER_ID_KEY);
        } catch (e1) {
            sid = null;
        }
        if (sid != null && sid !== "") {
            var byId = users.find(function (u) {
                return u && u.id != null && String(u.id) === String(sid);
            });
            return byId || null;
        }

        // Migrate legacy localStorage.loggedInUser into this tab's session and remove shared key.
        try {
            var raw = localStorage.getItem("loggedInUser");
            if (!raw) return null;
            var legacy = JSON.parse(raw);
            if (legacy && legacy.id != null) {
                try {
                    sessionStorage.setItem(AUTH_SESSION_USER_ID_KEY, String(legacy.id));
                } catch (e2) {}
                localStorage.removeItem("loggedInUser");
                var found = users.find(function (u) {
                    return u && u.id != null && String(u.id) === String(legacy.id);
                });
                return found || legacy;
            }
            // If legacy object is missing id, do not keep it as a shared session.
            return null;
        } catch (e3) {
            return null;
        }
    }

    function setLoggedInUserSession(user) {
        if (!user || user.id == null) return;
        try {
            sessionStorage.setItem(AUTH_SESSION_USER_ID_KEY, String(user.id));
        } catch (e) {}
        // Ensure legacy shared key cannot cause cross-tab account switching.
        try {
            localStorage.removeItem("loggedInUser");
        } catch (e2) {}
    }

    function clearLoggedInUserSession() {
        try {
            sessionStorage.removeItem(AUTH_SESSION_USER_ID_KEY);
        } catch (e) {}
        try {
            localStorage.removeItem("loggedInUser");
        } catch (e2) {}
    }

    function getCheckoutUserKey() {
        return checkoutStorageSuffixFromUser(getLoggedInUserFromStorage());
    }

    function checkoutStorageSuffixFromUser(u) {
        if (u && u.id != null) return "uid_" + String(u.id);
        if (u && u.username) return sanitizeKeyPart(u.username);
        return "Guest";
    }

    function legacyCheckoutKey(userKeySuffix, part) {
        return "checkout_" + userKeySuffix + "_" + part;
    }

    function clearLegacyCheckoutKeysForSuffix(userKeySuffix) {
        ["seats", "total", "concertId", "eventName", "concertDate", "venue", "owner"].forEach(function (part) {
            localStorage.removeItem(legacyCheckoutKey(userKeySuffix, part));
        });
    }

    function buildCheckoutOwnerSnapshot(u) {
        if (!u) {
            return { guest: true };
        }
        if (u.id != null) {
            return { id: u.id, username: u.username || "" };
        }
        if (u.username) {
            return { noId: true, username: u.username };
        }
        return { guest: true };
    }

    function checkoutOwnersAllowPay(ownerSnapshot, currentUser) {
        var o = ownerSnapshot || { guest: true };
        if (o.guest) {
            return !currentUser || currentUser.id == null;
        }
        if (o.noId) {
            if (!currentUser || !currentUser.username) return false;
            return sanitizeKeyPart(o.username) === sanitizeKeyPart(currentUser.username);
        }
        if (!currentUser || currentUser.id == null) return false;
        return String(o.id) === String(currentUser.id);
    }

    function sessionCheckoutKey(part) {
        return CHECKOUT_SESSION_PREFIX + part;
    }

    function readCheckoutSession() {
        var seatsRaw = sessionStorage.getItem(sessionCheckoutKey("seats"));
        var totalRaw = sessionStorage.getItem(sessionCheckoutKey("total"));
        var concertId = sessionStorage.getItem(sessionCheckoutKey("concertId")) || "";
        var eventName = sessionStorage.getItem(sessionCheckoutKey("eventName")) || "";
        var concertDate = sessionStorage.getItem(sessionCheckoutKey("concertDate")) || "";
        var venue = sessionStorage.getItem(sessionCheckoutKey("venue")) || "";
        var ownerRaw = sessionStorage.getItem(sessionCheckoutKey("owner"));

        var seats = [];
        try {
            seats = seatsRaw ? JSON.parse(seatsRaw) : [];
        } catch (e) {
            seats = [];
        }

        var owner = null;
        try {
            owner = ownerRaw ? JSON.parse(ownerRaw) : null;
        } catch (e2) {
            owner = null;
        }

        var totalNum = totalRaw != null && totalRaw !== "" ? Number(totalRaw) : 0;
        if (!totalNum && seats.length) {
            totalNum = seats.reduce(function (acc, s) {
                return acc + Number((s && s.price) || 0);
            }, 0);
        }

        if (!seats.length && localStorage) {
            var legacySuffix = getCheckoutUserKey();
            var legSeats = localStorage.getItem(legacyCheckoutKey(legacySuffix, "seats"));
            if (legSeats) {
                try {
                    seats = JSON.parse(legSeats) || [];
                } catch (e3) {
                    seats = [];
                }
                if (seats.length) {
                    totalRaw = localStorage.getItem(legacyCheckoutKey(legacySuffix, "total"));
                    concertId = localStorage.getItem(legacyCheckoutKey(legacySuffix, "concertId")) || "";
                    eventName = localStorage.getItem(legacyCheckoutKey(legacySuffix, "eventName")) || "";
                    concertDate = localStorage.getItem(legacyCheckoutKey(legacySuffix, "concertDate")) || "";
                    venue = localStorage.getItem(legacyCheckoutKey(legacySuffix, "venue")) || "";
                    totalNum = totalRaw != null && totalRaw !== "" ? Number(totalRaw) : 0;
                    if (!totalNum && seats.length) {
                        totalNum = seats.reduce(function (acc, s) {
                            return acc + Number((s && s.price) || 0);
                        }, 0);
                    }
                    var legOwner = localStorage.getItem(legacyCheckoutKey(legacySuffix, "owner"));
                    try {
                        owner = legOwner ? JSON.parse(legOwner) : buildCheckoutOwnerSnapshot(getLoggedInUserFromStorage());
                    } catch (e4) {
                        owner = buildCheckoutOwnerSnapshot(getLoggedInUserFromStorage());
                    }
                    if (!owner) owner = buildCheckoutOwnerSnapshot(getLoggedInUserFromStorage());
                    writeCheckoutSession({
                        seats: seats,
                        total: totalNum,
                        concertId: concertId,
                        eventName: eventName,
                        concertDate: concertDate,
                        venue: venue,
                        owner: owner
                    });
                    clearLegacyCheckoutKeysForSuffix(legacySuffix);
                }
            }
        }

        if (!owner && seats.length) {
            owner = buildCheckoutOwnerSnapshot(getLoggedInUserFromStorage());
        }

        return {
            seats: seats,
            total: totalNum,
            concertId: concertId,
            eventName: eventName,
            concertDate: concertDate,
            venue: venue,
            owner: owner
        };
    }

    function writeCheckoutSession(payload) {
        var owner = Object.prototype.hasOwnProperty.call(payload, "owner")
            ? payload.owner
            : buildCheckoutOwnerSnapshot(getLoggedInUserFromStorage());
        sessionStorage.setItem(sessionCheckoutKey("seats"), JSON.stringify(payload.seats || []));
        sessionStorage.setItem(sessionCheckoutKey("total"), String(payload.total != null ? payload.total : 0));
        sessionStorage.setItem(sessionCheckoutKey("concertId"), payload.concertId || "");
        sessionStorage.setItem(sessionCheckoutKey("eventName"), payload.eventName || "");
        sessionStorage.setItem(sessionCheckoutKey("concertDate"), payload.concertDate || "");
        sessionStorage.setItem(sessionCheckoutKey("venue"), payload.venue || "");
        sessionStorage.setItem(sessionCheckoutKey("owner"), JSON.stringify(owner));
        clearLegacyCheckoutKeysForSuffix(getCheckoutUserKey());
    }

    function clearCheckoutSession() {
        var ownerSnap = null;
        try {
            ownerSnap = JSON.parse(sessionStorage.getItem(sessionCheckoutKey("owner")));
        } catch (e) {
            ownerSnap = null;
        }
        sessionStorage.removeItem(sessionCheckoutKey("seats"));
        sessionStorage.removeItem(sessionCheckoutKey("total"));
        sessionStorage.removeItem(sessionCheckoutKey("concertId"));
        sessionStorage.removeItem(sessionCheckoutKey("eventName"));
        sessionStorage.removeItem(sessionCheckoutKey("concertDate"));
        sessionStorage.removeItem(sessionCheckoutKey("venue"));
        sessionStorage.removeItem(sessionCheckoutKey("owner"));
        clearLegacyCheckoutKeysForSuffix(getCheckoutUserKey());
        if (ownerSnap && !ownerSnap.guest) {
            if (ownerSnap.id != null) {
                clearLegacyCheckoutKeysForSuffix("uid_" + String(ownerSnap.id));
            } else if (ownerSnap.noId && ownerSnap.username) {
                clearLegacyCheckoutKeysForSuffix(sanitizeKeyPart(ownerSnap.username));
            }
        }
    }

    function formatSeatLine(seatEntry) {
        if (!seatEntry || typeof seatEntry !== "object") return "";
        var id = seatEntry.sectionId != null ? Number(seatEntry.sectionId) : 0;
        var label = seatEntry.sectionLabel || "";
        if (label) return seatEntry.seat + " — " + label;
        if (id > 0) return seatEntry.seat + " — Section " + id;
        return seatEntry.seat || "";
    }

    function formatSeatsSummary(seats) {
        if (!Array.isArray(seats) || !seats.length) return "—";
        return seats.map(formatSeatLine).join("; ");
    }

    /** @deprecated use historyStorageKeyForUser — kept for any old references */
    function historyKey(username) {
        return "ticketHistory_" + username;
    }

    window.TicketStore = {
        historyStorageKeyForUser: historyStorageKeyForUser,
        getHistoryForUser: getHistoryForUser,
        saveHistoryForUser: saveHistoryForUser,
        updateHistoryItemForUser: updateHistoryItemForUser,
        getAllPendingTransactions: getAllPendingTransactions,
        countHistoryByStatusForUser: countHistoryByStatusForUser,
        countUnreadHistoryForUser: countUnreadHistoryForUser,
        markHistoryNotifiedForUser: markHistoryNotifiedForUser,
        reservedKey: reservedKey,
        getReserved: getReserved,
        reserveSeats: reserveSeats,
        releaseSeats: releaseSeats,
        historyKey: historyKey,
        getLoggedInUserFromStorage: getLoggedInUserFromStorage,
        setLoggedInUserSession: setLoggedInUserSession,
        clearLoggedInUserSession: clearLoggedInUserSession,
        getCheckoutUserKey: getCheckoutUserKey,
        checkoutOwnersAllowPay: checkoutOwnersAllowPay,
        readCheckoutSession: readCheckoutSession,
        writeCheckoutSession: writeCheckoutSession,
        clearCheckoutSession: clearCheckoutSession,
        formatSeatLine: formatSeatLine,
        formatSeatsSummary: formatSeatsSummary
    };
})();
