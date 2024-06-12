import Card from "../components/Card"
import CardLaterais from "../components/CardLaterais";



function Curtidos() {
    return (
        <div className="container mt-4 ">
            <div className="d-flex flex-column justify-content-center align-items-center">
                <div className="mb-3 ">
                    <CardLaterais />
                </div>
                <div className="mb-3 ">
                    <CardLaterais />
                </div>
                <div className="mb-3">
                    <CardLaterais />
                </div>
                {/* Adicione mais Cards conforme necessário */}
            </div>
        </div>
    );
}



export default Curtidos