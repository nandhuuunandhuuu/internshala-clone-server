// Posting limit rules based on friend count:
// 0 friends -> cannot post
// 1 friend -> 1 post/day
// 2 friends -> 2 posts/day
// 3-9 friends -> scales linearly (N friends = N posts/day)
// 10+ friends -> unlimited
function getDailyPostLimit(friendCount) {
  if (friendCount === 0) return 0;
  if (friendCount >= 10) return Infinity;
  return friendCount;
}

module.exports = { getDailyPostLimit };