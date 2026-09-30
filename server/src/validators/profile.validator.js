function validateProfileUpdate({ fullName, email }) {
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

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

function validatePasswordChange({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};

  if (!currentPassword) {
    errors.currentPassword = "Current password is required";
  }

  if (!newPassword) {
    errors.newPassword = "New password is required";
  } else {
    if (newPassword.length <= 8) {
      errors.newPassword = "Password must be longer than 8 characters";
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = "Password must contain at least one uppercase letter";
    } else if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]';+/=~`]/.test(newPassword)) {
      errors.newPassword = "Password must contain at least one special character";
    }
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  validateProfileUpdate,
  validatePasswordChange
};
