let alertCallback = null;

export const alerts = {
  subscribe: (callback) => {
    alertCallback = callback;
    return () => {
      if (alertCallback === callback) {
        alertCallback = null;
      }
    };
  },
  alert: (message, title = "Aviso", type = "info") => {
    return new Promise((resolve) => {
      if (alertCallback) {
        alertCallback({
          type: "alert",
          title,
          message,
          typeStyle: type,
          resolve
        });
      } else {
        window.alert(`${title}\n\n${message}`);
        resolve();
      }
    });
  },
  confirm: (message, title = "Confirmación") => {
    return new Promise((resolve) => {
      if (alertCallback) {
        alertCallback({
          type: "confirm",
          title,
          message,
          resolve
        });
      } else {
        const res = window.confirm(message);
        resolve(res);
      }
    });
  }
};
