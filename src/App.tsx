
import styles from './App.module.css'
import {Route,Routes} from "react-router-dom"
import Home from './pages/Home'
import Navbar from './components/Navbar'
import Carrinho from './pages/Carrinho'
import Curtidos from './pages/Curtidos'
import Login from './pages/Login'
import Footer from './components/Footer'

function App() {
  

  return (

<div>
<Navbar />
<div className={styles.conteudo}> 
    <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/" element={<Home />} />
        <Route path="/carrinho" element={<Carrinho />} />
        <Route path="/curtidos" element={<Curtidos />} />
        <Route path="/login" element={<Login />} />
        {/* Adicione outras rotas aqui conforme necessário */}
    </Routes> </div>
    <Footer/>
</div>
  )
}

export default App
