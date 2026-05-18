const success = (res, data, status = 200) => res.status(status).json({ success: true, data });
const error = (res, message, code, status) => res.status(status).json({ success: false, message, code });

module.exports = { success, error };
