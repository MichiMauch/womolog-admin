// components/Login.js
import { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/send-magic-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (response.ok) {
      setMessage({ type: 'success', text: data.message });
    } else {
      setMessage({ type: 'error', text: data.error });
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button type="submit">Send Magic Link</button>
      {message && <p className={message.type}>{message.text}</p>}
    </form>
  );
};

export default Login;
