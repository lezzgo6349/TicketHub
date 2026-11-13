document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");

    const contact = document.getElementById("contact");
    const password = document.getElementById("password");

    const togglePassword = document.getElementById("togglePassword");

    // feedback box
    const loginFeedback = document.createElement("div");
    loginFeedback.className = "mt-2 text-danger";
    form.appendChild(loginFeedback);

    // ================= PASSWORD TOGGLE =================
    if (togglePassword) {
        togglePassword.addEventListener("click", () => {
            password.type = password.type === "password" ? "text" : "password";
            togglePassword.src = password.type === "password"
                ? "../media/close.svg"
                : "../media/Eye.svg";
        });
    }

    // ================= AUTO @gmail.com =================
    contact.addEventListener("blur", () => {
        let value = contact.value.trim();

        if (value === "") return;

        if (!value.includes("@")) {
            contact.value = value + "@gmail.com";
        }
    });

    // ================= LOGIN =================
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        let emailValue = contact.value.trim().toLowerCase();
        let passValue = password.value.trim();

        // auto add @gmail if missing
        if (!emailValue.includes("@")) {
            emailValue += "@gmail.com";
        }

        contact.value = emailValue;

        const users = JSON.parse(localStorage.getItem("ticketUsers")) || [];

        const user = users.find(u =>
            u.contact.toLowerCase() === emailValue &&
            u.password === passValue
        );

        if (!user) {
            loginFeedback.className = "mt-2 text-danger";
            loginFeedback.textContent = "Email or password is incorrect";
            return;
        }

        // save session (per-tab). Do NOT use localStorage for active session.
        if (typeof TicketStore !== "undefined" && typeof TicketStore.setLoggedInUserSession === "function") {
            TicketStore.setLoggedInUserSession(user);
        } else {
            sessionStorage.setItem("ticketHubAuth_userId", String(user.id));
            localStorage.removeItem("loggedInUser");
        }

        loginFeedback.className = "mt-2 text-success";
        loginFeedback.textContent = "Login successful ✓";

        // redirect to homepage
        setTimeout(() => {
            window.location.href = "../HTML/homepage.html";
        }, 800);
    });

});