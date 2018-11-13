function cameraName( label: string ) {
	const clean = label.replace( /\s*\([0-9a-f]+(:[0-9a-f]+)?\)\s*$/, '' );
	return clean || label || null;
}

class MediaError extends Error {
	constructor(public type: string, public inner?: Error ) {
		super( inner
			? `Cannot access video stream (${type}: ${inner.message}).`
			: `Cannot access video stream (${type}).` );
	}
}

export default class Camera {
	private _stream: MediaStream;

	constructor(public id: string, public name: string ) {
		this._stream = null;
	}

	async start(facingMode) {
    const constraints: any = {
      audio: false,
      video: {
        deviceId: {
          exact: this.id
        },
        optional: []
      }
    };

    if ( facingMode && typeof facingMode === 'string' ) {
      constraints.video.facingMode = facingMode;
    }

    this._stream = await Camera.wrapErrors( async () => {
      return await navigator.mediaDevices.getUserMedia( constraints );
    } );

    return this._stream;
	}

	stop() {
		if ( !this._stream ) {
			return;
		}

		for ( const stream of this._stream.getVideoTracks() ) {
			stream.stop();
		}

		this._stream = null;
	}

	static async getCameras() {
		await Camera.ensureAccess();

		const devices = await navigator.mediaDevices.enumerateDevices();

		return devices
			.filter( d => d.kind === 'videoinput' )
			.map( d => new Camera( d.deviceId, cameraName( d.label ) ) );
	}

	static async ensureAccess() {
		return await Camera.wrapErrors( async () => {
			const access = await navigator.mediaDevices.getUserMedia( { video: true } );
			for ( const stream of access.getVideoTracks() ) {
				stream.stop();
			}
		} );
	}

	static async wrapErrors<T>( fn: () => Promise<T> ): Promise<T> {
		try {
			return await fn();
		} catch ( e ) {
			if ( e.name && process.env.NODE_ENV !== "development" ) {
				throw new MediaError( e.name, e );
			} else {
				throw e;
			}
		}
	}
}
