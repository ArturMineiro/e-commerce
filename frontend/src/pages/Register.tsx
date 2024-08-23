import React, { useState } from 'react';
import axios from 'axios';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
  });
  
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('http://localhost:8000/api/register', formData);
      alert('Usuário registrado com sucesso!');
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'customer',
      });
      setError(null);
    } catch (error: any) {
      if (error.response) {
        console.error('Dados do erro:', error.response.data);
        console.error('Status:', error.response.status);
        console.error('Cabeçalhos:', error.response.headers);
        setError('Erro ao registrar usuário. Verifique os dados e tente novamente.');
      } else {
        console.error('Erro:', error.message);
        setError('Erro ao registrar usuário. Tente novamente.');
      }
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="register-container w-75 w-md-50">
        <div className="register-form shadow p-4 mb-5 bg-white rounded">
          <h2 className="text-center">Registro</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="col-md-12 mb-3">
                <label htmlFor="name">Nome</label>
                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="col-md-12 mb-3">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Seu email"
                  required
                />
              </div>
              <div className="col-md-12 mb-3">
                <label htmlFor="password">Senha</label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Sua senha"
                  required
                />
              </div>
              <div className="col-md-12 mb-3">
                <label htmlFor="role">Tipo de Usuário</label>
                <select
                  className="form-control"
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="customer">Cliente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            {error && <div className="alert alert-danger text-center">{error}</div>}
            <button className="btn btn-primary btn-block" type="submit">Registrar</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
