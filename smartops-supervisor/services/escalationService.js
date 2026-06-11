const Escalation = require('../models/Escalation');
const { getIO } = require('../socket/escalationSocket');

class EscalationService {
  async getAllEscalations() {
    return await Escalation.find().sort({ createdAt: -1 });
  }

  async getEscalationById(id) {
    const escalation = await Escalation.findById(id);
    if (!escalation) {
      const error = new Error('Escalation not found');
      error.statusCode = 404;
      throw error;
    }
    return escalation;
  }

  async createEscalation(escalationData) {
    const escalation = await Escalation.create(escalationData);
    
    // Broadcast via socket.io
    const io = getIO();
    if (io) {
      io.emit('escalationCreated', escalation);
    }
    
    return escalation;
  }

  async updateEscalation(id, escalationData) {
    const escalation = await Escalation.findByIdAndUpdate(id, escalationData, {
      new: true,
      runValidators: true
    });
    if (!escalation) {
      const error = new Error('Escalation not found');
      error.statusCode = 404;
      throw error;
    }

    const io = getIO();
    if (io) {
      io.emit('escalationUpdated', escalation);
    }

    return escalation;
  }

  async deleteEscalation(id) {
    const escalation = await Escalation.findByIdAndDelete(id);
    if (!escalation) {
      const error = new Error('Escalation not found');
      error.statusCode = 404;
      throw error;
    }
    return true;
  }
}

module.exports = new EscalationService();
