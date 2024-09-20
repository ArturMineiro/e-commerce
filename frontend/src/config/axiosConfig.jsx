// src/config/axiosConfig.ts
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api', // URL base do backend
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar o token em todas as requisições protegidas
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if(token && config.headers){
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
