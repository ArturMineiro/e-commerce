
import styles from './App.module.css'
import {Route,Routes} from "react-router-dom"
import Home from './pages/Home'
import Navbar from './components/Navbar'

function App() {
  

  return (

<div>
<Navbar />
<div className={styles.conteudo}> 
    <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/" element={<Home />} />
        {/* Adicione outras rotas aqui conforme necessário */}
    </Routes> </div>
</div>
  )
}

export default App
