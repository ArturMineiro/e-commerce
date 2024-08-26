import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const navigate = useNavigate(); // Hook para navegação

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const loginUser = async (credentials: { email: string; password: string }) => {
    try {
      const response = await axios.post('http://localhost:8000/api/login', credentials);
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirecionar com base no perfil do usuário
      if (user.role === 'admin') {
        navigate('/admin/Cadastrarprodutos');
      } else {
        navigate('/home');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginUser(credentials);
  };

  return (
    <div className="container mt-5">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            className="form-control"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Senha</label>
          <input
            type="password"
            className="form-control"
            name="password"
            value={credentials.password}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary mt-3">Entrar</button>
      </form>
      <div className="mt-3">
        <Link to="/register">Não tem uma conta? Registre-se aqui.</Link>
      </div>
    </div>
  );
};

export default Login;
