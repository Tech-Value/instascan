function cameraName(label) {
  let clean = label.replace(/\s*\([0-9a-f]+(:[0-9a-f]+)?\)\s*$/, '');
  return clean || label || null;
}

class MediaError extends Error {
  constructor(type) {
    super(`Cannot access video stream (${type}).`);
    this.type = type;
  }
}

class Camera {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this._stream = null;
  }

  static async getCameras(options) {
    const defaults = { video: { facingMode: 'environment' } };
    const constraints = Object.assign({}, defaults, options);

    // Mark the environment camera as busy to get priority over other applications
    const streams = await this._ensureAccess(constraints);

    // Retrieve all videoinput devices
    const devices = await navigator.mediaDevices.enumerateDevices();

    const videoDevices = devices
      .filter(d => d.kind === 'videoinput')
      .map(d => new Camera(d.deviceId, cameraName(d.label)));

    // Release the environment camera to evade locking it
    for (let stream of streams.getVideoTracks()) {
      stream.stop();
    }

    // Return the list of video devices, sort by name (environment camere should be the first)
    return videoDevices.sort((a, b) => a.name > b.name);
  }

  static async _ensureAccess(constraints) {
    return this._wrapErrors(async () => {
      return await navigator.mediaDevices.getUserMedia(constraints);
    });
  }

  static async _wrapErrors(fn) {
    try {
      return fn();
    } catch (e) {
      if (e.name) {
        throw new MediaError(e.name);
      } else {
        throw e;
      }
    }
  }

  async start() {
    this._stream = await Camera._wrapErrors(async () => {
      return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: {
            exact: this.id
          }
        }
      });
    });

    return this._stream;
  }

  stop() {
    if (!this._stream) {
      return;
    }

    for (let stream of this._stream.getVideoTracks()) {
      stream.stop();
    }

    this._stream = null;
  }
}

module.exports = Camera;