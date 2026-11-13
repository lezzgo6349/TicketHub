/**
 * Requires: window.jspdf, QRCode on page, #qrcode element optional (created if missing)
 */
window.generateTicketPdf = function (options) {
    const username = options.username;
    const eventName = options.eventName;
    const concertDate = options.concertDate;
    const venue = options.venue || "Tupi Gymnasium";
    const seatNames = options.seatNames;
    const sectionsSummary = options.sectionsSummary || "";
    const total = options.total;
    const transactionId = options.transactionId;

    const qrData = JSON.stringify({
        user: username,
        event: eventName,
        seats: seatNames,
        total: total,
        id: transactionId
    });

    let qrContainer = document.getElementById("qrcode");
    if (!qrContainer) {
        qrContainer = document.createElement("div");
        qrContainer.id = "qrcode";
        qrContainer.style.display = "none";
        document.body.appendChild(qrContainer);
    }
    qrContainer.innerHTML = "";

    return new Promise(function (resolve, reject) {
        try {
            new QRCode(qrContainer, {
                text: qrData,
                width: 128,
                height: 128
            });
        } catch (e) {
            reject(e);
            return;
        }

        setTimeout(function () {
            const img = qrContainer.querySelector("img");
            if (!img || !img.src) {
                reject(new Error("QR image not ready"));
                return;
            }

            let jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
            if (!jsPDFCtor && window.jspdf && window.jspdf.default) {
                jsPDFCtor = window.jspdf.default.jsPDF;
            }
            if (!jsPDFCtor) {
                reject(new Error("jsPDF missing"));
                return;
            }

            const doc = new jsPDFCtor();
            doc.setFontSize(18);
            doc.text("TicketHub Receipt", 20, 20);
            doc.setFontSize(12);
            let y = 30;
            doc.text("Username: " + username, 20, y);
            y += 10;
            doc.text("Event: " + eventName, 20, y);
            y += 10;
            doc.text("Seats: " + seatNames, 20, y);
            y += 10;
            if (sectionsSummary) {
                const secLines = doc.splitTextToSize("Sections: " + sectionsSummary, 110);
                doc.text(secLines, 20, y);
                y += secLines.length * 7 + 3;
            }
            doc.text("Total: PHP " + Number(total).toFixed(2), 20, y);
            y += 10;
            doc.text("Date: " + concertDate, 20, y);
            y += 10;
            doc.text("Location: " + venue, 20, y);
            doc.addImage(img.src, "PNG", 140, 28, 50, 50);
            doc.save("TicketHub_Ticket.pdf");
            resolve();
        }, 400);
    });
};
