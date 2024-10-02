import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Importando os ícones de olho
import { Modal } from 'react-bootstrap'; // Importando o Modal do Bootstrap

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [passwordValidationError, setPasswordValidationError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Estado para controlar a exibição do modal de sucesso

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'A senha deve ter pelo menos 8 caracteres.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'A senha deve conter pelo menos uma letra maiúscula.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setPasswordValidationError(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      await axios.post('http://localhost:8000/api/register', {
        ...formData,
        role: 'customer',
      });

      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      setError(null);
      setPasswordValidationError(null);
      setShowSuccessModal(true); // Mostrar o modal de sucesso

      // Fechar o modal automaticamente após 3 segundos
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 409) {
          setError('Este email já está cadastrado. Deseja recuperar sua senha?');
        } else {
          setError('Erro ao registrar usuário. Verifique os dados e tente novamente.');
        }
      } else {
        setError('Erro ao registrar usuário. Tente novamente.');
      }
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="register-container w-50 w-md-50">
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
              <div className="col-md-12 mb-3 position-relative">
                <label htmlFor="password">Senha</label>
                <div className="input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Sua senha"
                    required
                  />
                  <div className="input-group-append">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                {passwordValidationError && (
                  <div className="alert alert-warning mt-2">{passwordValidationError}</div>
                )}
              </div>
              <div className="col-md-12 mb-3 position-relative">
                <label htmlFor="confirmPassword">Confirmar Senha</label>
                <div className="input-group">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-control"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirme sua senha"
                    required
                  />
                  <div className="input-group-append">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={toggleConfirmPasswordVisibility}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-block mb-3" type="submit">
              Registrar
            </button>
            {error && <div className="alert alert-danger text-center">{error}</div>}
          </form>

          <div className="mt-3">
            <Link to="/login">Já tem uma conta? Entre aqui.</Link>
          </div>
        </div>
      </div>

      {/* Modal de Sucesso */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Body>
          <div className="text-center">
            <h5>Cadastrado com sucesso!</h5>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Register;
