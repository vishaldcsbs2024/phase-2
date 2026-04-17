let ioInstance = null;

const setSocketServer = (io) => {
  ioInstance = io;
};

const getSocketServer = () => ioInstance;

const emitRealtimeEvent = (eventName, payload) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit(eventName, payload);
};

module.exports = {
  setSocketServer,
  getSocketServer,
  emitRealtimeEvent,
};
