const db = require("../config/db");

exports.login = (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username=? AND password=?";
  
  db.query(sql, [username, password], (err, result) => {
    if (err) return res.status(500).json({ msg: "DB Error" });

    if (result.length > 0) {
      res.json({ success: true, msg: "Login Success" });
    } else {
      res.json({ success: false, msg: "Invalid Username or Password" });
    }
  });
};
