function getBranchId(req) {
  if (req.branchId) return req.branchId;

  const fromQuery = req.query?.branch_id;
  if (fromQuery) return parseInt(fromQuery, 10);

  const fromHeader = req.headers?.["x-active-branch"];
  if (fromHeader) return parseInt(fromHeader, 10);

  if (req.user?.branch_ids?.length) return req.user.branch_ids[0];
  if (req.user?.branch_id) return req.user.branch_id;

  return null;
}

function branchWhere(branchId, alias) {
  if (!branchId) return { clause: "1=1", params: [] };
  const col = alias ? `${alias}.branch_id` : "branch_id";
  return { clause: `${col} = ?`, params: [branchId] };
}

function branchIdForInsert(req) {
  return getBranchId(req) || 1;
}

module.exports = { getBranchId, branchWhere, branchIdForInsert };
