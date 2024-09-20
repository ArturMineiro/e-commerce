import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); 
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const loginUser = async (credentials: { email: string; password: string }) => {
    try {
      const response = await axios.post('http://localhost:8000/api/login', credentials, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const { access_token, user } = response.data;
      login(access_token, user);

      // Redirecionar com base no perfil do usuário
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 401) {
          setError('Credenciais inválidas. Por favor, tente novamente.');
        } else if (error.response.status === 422) {
          setError('Por favor, preencha todos os campos corretamente.');
        } else {
          setError('Erro no servidor. Tente novamente mais tarde.');
        }
        console.error('Erro ao fazer login:', error.response.data);
      } else {
        setError('Erro ao conectar com o servidor.');
        console.error('Erro ao fazer login:', error.message);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(credentials.email === '' || credentials.password === ''){
      setError('Por favor, preencha todos os campos.');
      return;
    }
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
        <button type="submit" className="btn btn-primary mt-3 mb-3">Entrar</button>
      </form>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="mt-3">
        <Link to="/register">Não tem uma conta? Registre-se aqui.</Link>
      </div>
    </div>
  );
};

export default Login;
