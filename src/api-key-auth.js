function apiKeyAuth(key) {
  return (req, res, next) => {
    const userKey = req.headers['x-api-key'];
    if (!userKey) {
      res.status(401).json({ auth: false, message: 'Missing X-API-KEY header.' });
      return;
    }

    if (userKey !== key) {
      res.status(401).json({ auth: false, message: 'Wrong api key.' });
      return;
    }

    next();
  };
}

export default apiKeyAuth;
