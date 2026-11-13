document.addEventListener("DOMContentLoaded", () => {
    const seats = document.querySelectorAll(".seat-icon");
    const selectedCount = document.querySelector(".bottom-bar .fw-semibold");
    const bottomBar = document.querySelector(".bottom-bar");
    const removeBtn = document.querySelector(".remove-btn");

    const selectedImg = "../media/Seats.svg";
    const concertId = document.body.dataset.concertId || "";

    function getConcertPrices(id) {
        const pricingByConcert = {
            concert_2: { standard: 250, premium: 475, vip: 650 },
            concert_3: { standard: 320, premium: 550, vip: 1000 },
            concert_4: { standard: 199, premium: 499, vip: 999 }
        };
        return pricingByConcert[id] || { standard: 150, premium: 235, vip: 300 };
    }
    const concertPrices = getConcertPrices(concertId);

    function sectionMetaFromTier(tier) {
        if (tier === "VIP") return { sectionId: 1, sectionLabel: "Section 1 — VIP" };
        if (tier === "Premium") return { sectionId: 2, sectionLabel: "Section 2 — Premium" };
        if (tier === "Standard") return { sectionId: 3, sectionLabel: "Section 3 — Standard" };
        return { sectionId: 0, sectionLabel: "" };
    }

    function getSeatKey(seat) {
        const numberEl = seat.closest(".seat") && seat.closest(".seat").querySelector(".seat-number");
        const number = numberEl ? numberEl.textContent.trim() : "";
        const row =
            seat
                .closest("[class^='A'], [class^='B'], [class^='C'], [class^='D'], [class^='E'], [class^='F']")
                ?.querySelector("h5")
                ?.textContent.trim() || "";
        return row + number;
    }

    function isSeatTaken(key) {
        if (!concertId || !window.TicketStore) return false;
        const taken = window.TicketStore.getReserved(concertId);
        return taken.indexOf(key) !== -1;
    }

    function getSeatType(seat) {
        const src = seat.src;

        if (src.includes("VIP")) return { type: "VIP", price: concertPrices.vip, img: "../media/VIP.svg" };
        if (src.includes("Premium")) return { type: "Premium", price: concertPrices.premium, img: "../media/Premium.svg" };
        if (src.includes("Available")) return { type: "Standard", price: concertPrices.standard, img: "../media/Available.svg" };
        if (src.includes("Reserved")) return { type: "Reserved", price: 0, img: "../media/Reserved.svg" };

        return null;
    }

    function applyStoredReservations() {
        if (!concertId || !window.TicketStore) return;
        const reserved = window.TicketStore.getReserved(concertId);
        if (!reserved.length) return;

        seats.forEach((seat) => {
            const key = getSeatKey(seat);
            if (reserved.indexOf(key) === -1) return;
            seat.src = "../media/Reserved.svg";
            seat.style.pointerEvents = "none";
            seat.dataset.fromCheckoutReserve = "1";
        });
    }

    function seededRandom(seed) {
        let x = seed % 2147483647;
        if (x <= 0) x += 2147483646;
        return function () {
            x = (x * 16807) % 2147483647;
            return (x - 1) / 2147483646;
        };
    }

    function seedFromConcertId(id) {
        let out = 0;
        for (let i = 0; i < id.length; i++) {
            out = (out * 31 + id.charCodeAt(i)) % 2147483647;
        }
        return out || 1;
    }

    function randomizeReservedSeatsForConcerts() {
        if (!concertId || !window.TicketStore) return;
        if (concertId !== "concert_3" && concertId !== "concert_4") return;

        const existing = window.TicketStore.getReserved(concertId);
        if (existing.length) return;

        const candidates = [];
        seats.forEach((seat) => {
            const seatInfo = getSeatType(seat);
            if (!seatInfo || seatInfo.type === "Reserved") return;
            const key = getSeatKey(seat);
            if (!key) return;
            candidates.push(key);
        });

        if (!candidates.length) return;

        const rand = seededRandom(seedFromConcertId(concertId));
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            const tmp = candidates[i];
            candidates[i] = candidates[j];
            candidates[j] = tmp;
        }

        // Keep random reserved seats up to max 50.
        const minReserved = 30;
        const maxReserved = 50;
        const reserveCount = Math.min(candidates.length, minReserved + Math.floor(rand() * (maxReserved - minReserved + 1)));
        const chosen = candidates.slice(0, reserveCount);
        window.TicketStore.reserveSeats(concertId, chosen);
    }

    function updateCounter() {
        const selectedSeats = document.querySelectorAll(".seat-icon.selected");

        let total = 0;

        selectedSeats.forEach((seat) => {
            total += Number(seat.dataset.price);
        });

        const count = selectedSeats.length;

        if (selectedCount) {
            selectedCount.textContent = `${count} seat/s selected ₱ ${total.toFixed(2)}`;
        }

        if (bottomBar) {
            bottomBar.classList.toggle("show", count > 0);
        }
    }

    function clearAllSeats() {
        const selectedSeats = document.querySelectorAll(".seat-icon.selected");

        selectedSeats.forEach((seat) => {
            seat.classList.remove("selected");
            seat.src = seat.dataset.original;
            delete seat.dataset.price;
        });

        updateCounter();
    }

    randomizeReservedSeatsForConcerts();
    applyStoredReservations();

    seats.forEach((seat) => {
        const seatInfo = getSeatType(seat);

        if (!seatInfo || seatInfo.type === "Reserved") {
            seat.style.pointerEvents = "none";
            return;
        }

        const meta = sectionMetaFromTier(seatInfo.type);
        seat.dataset.original = seatInfo.img;
        seat.dataset.price = seatInfo.price;
        seat.dataset.tier = seatInfo.type;
        seat.dataset.sectionId = String(meta.sectionId);
        seat.dataset.sectionLabel = meta.sectionLabel;

        seat.addEventListener("click", () => {
            const key = getSeatKey(seat);
            const isSelected = seat.classList.contains("selected");

            if (!isSelected && isSeatTaken(key)) {
                alert("This seat is already reserved or pending. Please choose another seat.");
                return;
            }

            if (isSelected) {
                seat.classList.remove("selected");
                seat.src = seat.dataset.original;
            } else {
                seat.classList.add("selected");
                seat.src = selectedImg;
            }

            updateCounter();
        });
    });

    if (removeBtn) {
        removeBtn.addEventListener("click", clearAllSeats);
    }

    updateCounter();
});

const buyBtn = document.getElementById("buyBtn");

if (buyBtn) {
    buyBtn.addEventListener("click", () => {
        const selectedSeats = document.querySelectorAll(".seat-icon.selected");

        let seatsData = [];
        let total = 0;

        const concertId = document.body.dataset.concertId || "";

        selectedSeats.forEach((seat) => {
            const number = seat.closest(".seat").querySelector(".seat-number").textContent.trim();
            const row =
                seat
                    .closest("[class^='A'], [class^='B'], [class^='C'], [class^='D'], [class^='E'], [class^='F']")
                    ?.querySelector("h5")
                    ?.textContent.trim() || "";

            const price = Number(seat.dataset.price);
            const sectionId = Number(seat.dataset.sectionId) || 0;
            const sectionLabel = seat.dataset.sectionLabel || "";

            seatsData.push({
                seat: `${row}${number}`,
                price: price,
                sectionId: sectionId,
                sectionLabel: sectionLabel,
                tier: seat.dataset.tier || ""
            });

            total += price;
        });

        if (seatsData.length === 0) {
            return;
        }

        if (!concertId || !window.TicketStore) {
            alert("Concert data is missing. Please refresh the page.");
            return;
        }

        const seatKeys = seatsData.map(function (s) {
            return s.seat;
        });
        const reserved = window.TicketStore.getReserved(concertId);
        const blocked = seatKeys.filter(function (k) {
            return reserved.indexOf(k) !== -1;
        });
        if (blocked.length) {
            alert(
                "These seats are no longer available (another customer may have completed checkout): " +
                    blocked.join(", ") +
                    ". Please update your selection."
            );
            return;
        }

        const body = document.body;
        window.TicketStore.writeCheckoutSession({
            seats: seatsData,
            total: total,
            concertId: concertId,
            eventName: body.dataset.eventName || "Concert",
            concertDate: body.dataset.concertDate || "",
            venue: body.dataset.venue || "Tupi Gymnasium"
        });

        window.location.href = "checkout.html";
    });
}
