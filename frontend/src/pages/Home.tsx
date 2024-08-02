
import Card from "../components/Card";
import Carroussel from "../components/Carroussel";

function Home() {
    return (
        <div className="container mt-5">
            <h1 className="text-center">Home Page</h1>
       
         <Carroussel />
        
            <p className="lead text-center">Bem-vindo à página inicial!</p>
            <div className="row justify-content-center">
                <div className="col-md-4 d-flex justify-content-center">
                    <Card />
                </div>
                <div className="col-md-4 d-flex justify-content-center">
                    <Card />
                </div>
                <div className="col-md-4 d-flex justify-content-center">
                    <Card />
                </div>
            </div>
            <div className="row justify-content-center">
                <div className="col-md-4 d-flex justify-content-center">
                    <Card />
                </div>
                <div className="col-md-4 d-flex justify-content-center">
                    <Card />
                </div>
                <div className="col-md-4 d-flex justify-content-center">
                    <Card />
                </div>
            </div>
        </div>
    );
}

export default Home;
