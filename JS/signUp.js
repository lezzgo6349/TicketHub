document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("signupForm");

    const username = document.getElementById("username");
    const contact = document.getElementById("contact");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    const togglePassword = document.getElementById("togglePassword");
    const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

    const confirmFeedback = document.getElementById("confirmFeedback");
    const passwordFeedback = document.getElementById("passwordFeedback");
    const emailExists = document.getElementById("emailExists");

    const submitBtn = form.querySelector("button");

    let users = JSON.parse(localStorage.getItem("ticketUsers")) || [];

    // ================= PASSWORD TOGGLE =================
    if (togglePassword) {
        togglePassword.addEventListener("click", () => {
            password.type = password.type === "password" ? "text" : "password";
            togglePassword.src = password.type === "password"
                ? "../media/close.svg"
                : "../media/Eye.svg";
        });
    }

    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener("click", () => {
            confirmPassword.type = confirmPassword.type === "password" ? "text" : "password";
            toggleConfirmPassword.src = confirmPassword.type === "password"
                ? "../media/close.svg"
                : "../media/Eye.svg";
        });
    }

    // ================= PASSWORD LENGTH CHECK =================
    password.addEventListener("input", () => {

        if (password.value.length === 0) {
            passwordFeedback.textContent = "";
            return;
        }

        if (password.value.length < 8) {
            passwordFeedback.textContent = "Password must be at least 8 characters";
            passwordFeedback.className = "text-danger";
        } else {
            passwordFeedback.textContent = "Strong password ✓";
            passwordFeedback.className = "text-success";
        }
    });

    // ================= PASSWORD MATCH CHECK =================
    function checkMatch() {
        const match = confirmPassword.value === password.value;

        if (confirmPassword.value === "") {
            confirmFeedback.textContent = "";
            return false;
        }

        if (match) {
            confirmFeedback.textContent = "Passwords match ✓";
            confirmFeedback.className = "text-success";
        } else {
            confirmFeedback.textContent = "Passwords do not match ✗";
            confirmFeedback.className = "text-danger";
        }

        return match;
    }

    confirmPassword.addEventListener("input", checkMatch);
    password.addEventListener("input", checkMatch);

    // ================= AUTO @gmail.com =================
    contact.addEventListener("blur", () => {
        let value = contact.value.trim();

        if (value === "") return;

        if (!value.includes("@")) {
            contact.value = value + "@gmail.com";
        }
    });

    // clear duplicate message when typing
    contact.addEventListener("input", () => {
        emailExists.textContent = "";
    });

    // ================= FORM SUBMIT =================
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        submitBtn.disabled = true;

        const match = checkMatch();

        // ✅ FIXED username check
        if (!username.value.trim()) {
            submitBtn.disabled = false;
            return;
        }

        // password length check
        if (password.value.length < 8) {
            passwordFeedback.textContent = "Password must be at least 8 characters";
            passwordFeedback.className = "text-danger";
            submitBtn.disabled = false;
            return;
        }

        // password match check
        if (!match) {
            submitBtn.disabled = false;
            return;
        }

        // email fix
        let emailValue = contact.value.trim();

        if (!emailValue.includes("@")) {
            emailValue += "@gmail.com";
        }

        // duplicate check (email must be unique)
        const exists = users.find(u => u.contact === emailValue);

        if (exists) {
            emailExists.textContent = "Account already used! Please Sign In instead.";
            submitBtn.disabled = false;
            return;
        } else {
            emailExists.textContent = "";
        }

        const nameTaken = users.some(u => u.username.trim().toLowerCase() === username.value.trim().toLowerCase());
        if (nameTaken) {
            emailExists.textContent = "That username is already taken. Please choose another.";
            submitBtn.disabled = false;
            return;
        }

        // save user
        const newUser = {
            id: Date.now(),
            username: username.value.trim(),
            contact: emailValue,
            password: password.value
        };

        users.push(newUser);
        localStorage.setItem("ticketUsers", JSON.stringify(users));

        // redirect
        setTimeout(() => {
            window.location.href = "../HTML/signIn.html";
        }, 100);
    });

});