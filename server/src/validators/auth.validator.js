function validateRegistration({ fullName, email, password }) {
  const errors = {};

  if (!fullName || !fullName.trim()) {
    errors.fullName = "Full name is required";
  }

  if (!email || !email.trim()) {    
    errors.email = "Email is required";
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }
  }

  if (!password) {
    errors.password = "Password is required";
  } else {
    if (password.length <= 8) {
      errors.password = "Password must be longer than 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must contain at least one uppercase letter";
    } else if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]';+/=~`]/.test(password)) {
      errors.password = "Password must contain at least one special character";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  validateRegistration
};