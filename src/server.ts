import './config';

import app from './app';

const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Welcome to MA!');
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});