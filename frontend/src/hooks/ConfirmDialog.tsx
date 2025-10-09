// ConfirmDialog.js
import React from "react";
import { Modal, Button } from "react-bootstrap";
function ConfirmDialog({ show, title, message, onConfirm, onCancel }) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title || "Confirmação"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message || "Você tem certeza?"}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Confirmar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ConfirmDialog;
