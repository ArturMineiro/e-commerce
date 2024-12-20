import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';
import jwtDecode from 'jwt-decode';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Importando os ícones

interface Credentials {
  email: string;
  password: string;
}

interface APIResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface DecodedToken {
  sub: number;
  name: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<Credentials>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false); // Estado para alternar a visualização da senha
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword); // Alterna entre mostrar e esconder a senha
  };

  const loginUser = async (credentials: Credentials) => {
    try {
      const response = await axios.post<APIResponse>('http://localhost:8000/api/login', credentials, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const { access_token } = response.data;
  
      login(access_token);
  
      const decoded = jwtDecode<DecodedToken>(access_token);
      if (!decoded) {
        setError('Erro ao decodificar o token.');
        return;
      }
  
      const userRole = decoded.role;
  
      if (userRole === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 422) {
          setError('Credenciais inválidas. Por favor, tente novamente.');
        } else {
          setError('Erro no servidor. Tente novamente mais tarde.');
        }
      } else {
        setError('Erro ao conectar com o servidor.');
      }
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (credentials.email === '' || credentials.password === '') {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    loginUser(credentials);
  };

  return (
    <div className="container mt-5 w-25 shadow-lg p-3 mb-5 bg-white rounded">
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group ">
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
          <div className="input-group">
            <input
              type={showPassword ? 'text' : 'password'} // Alterna entre tipo "text" e "password"
              className="form-control"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
            />
            <div className="input-group-append">
              <button 
                type="button" 
                className="btn btn-outline-secondary" 
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />} {/* Alterna ícones */}
              </button>
            </div>
          </div>
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
