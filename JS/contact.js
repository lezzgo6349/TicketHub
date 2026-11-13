function sendFeedback() {
    const currentUser =
        typeof TicketStore !== "undefined" && typeof TicketStore.getLoggedInUserFromStorage === "function"
            ? TicketStore.getLoggedInUserFromStorage()
            : null;
    const message = document.getElementById("message").value;

    if (!currentUser || !currentUser.username || !currentUser.contact) {
        document.getElementById("status").textContent = "Please sign in first before sending feedback.";
        return;
    }

    if (!message.trim()) {
        document.getElementById("status").textContent = "Please enter your feedback first!";
        return;
    }

    const feedback = {
        id: Date.now(),
        name: currentUser.username,
        email: currentUser.contact,
        message: message.trim(),
        date: new Date().toLocaleString()
    };

    let feedbackList = JSON.parse(localStorage.getItem("feedbacks")) || [];
    feedbackList.push(feedback);

    localStorage.setItem("feedbacks", JSON.stringify(feedbackList));

    document.getElementById("status").textContent = "Feedback sent successfully!";

    document.getElementById("message").value = "";
}