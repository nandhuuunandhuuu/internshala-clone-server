// Rule-based trust indicators - honest, explainable, no fake AI claims
function getListingFlags(listing) {
  const flags = [];

  if (!listing.description || listing.description.length < 40) {
    flags.push("Short or missing description");
  }
  if (!listing.skills || listing.skills.length === 0) {
    flags.push("No skills listed");
  }
  if (!listing.companyId) {
    flags.push("Not linked to a verified company account");
  }

  return flags;
}

module.exports = { getListingFlags };