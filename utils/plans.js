const PLANS = {
  free: { label: "Free", price: 0, limit: 1 },
  bronze: { label: "Bronze", price: 100, limit: 3 },
  silver: { label: "Silver", price: 300, limit: 5 },
  gold: { label: "Gold", price: 1000, limit: Infinity },
};

function getMonthlyLimit(plan) {
  return PLANS[plan]?.limit ?? 1;
}

// Resets the counter if we've entered a new calendar month since last renewal
function resetIfNewMonth(user) {
  const now = new Date();
  const last = user.planRenewedAt ? new Date(user.planRenewedAt) : null;
  const isNewMonth = !last || last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear();
  if (isNewMonth) {
    user.applicationsThisMonth = 0;
    user.planRenewedAt = now;
  }
  return user;
}

// Payment window: 10:00 AM - 11:00 AM IST only
function isWithinPaymentWindow() {
  const now = new Date();
  const istOffset = 5.5 * 60; // IST is UTC+5:30, in minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + istOffset) % (24 * 60);
  const istHour = Math.floor(istMinutes / 60);
  return istHour === 10; // 10:00-10:59 AM IST only
}

module.exports = { PLANS, getMonthlyLimit, resetIfNewMonth, isWithinPaymentWindow };