/**
 * 
 */
package digilib.io;

import java.io.InputStream;

/**
 * @author casties
 *
 */
public class ImageStream extends ImageInput {

	protected InputStream stream = null;
	
	public ImageStream(InputStream stream, String mimeType) {
		this.stream = stream;
		this.mimetype = mimeType;
	}
	
	public InputStream getStream() {
		return stream;
	}
}
