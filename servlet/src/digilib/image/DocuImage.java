/* DocuImage -- General image interface class

  Digital Image Library servlet components

  Copyright (C) 2001, 2002 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

*/

package digilib.image;

import java.io.File;

import javax.servlet.ServletResponse;

import digilib.io.FileOpException;


/** The basic class for the representation of a digilib image.
 *
 * The actual image object is hidden in the class, only methods for loading,
 * manipulation, and saving are exported. This strategy enables implementations
 * using different toolkits that rely on different image base classes (like
 * JIMI, Java2D and JAI).
 */
public interface DocuImage {

  /** Returns the list of image file types known to the DocuImage implementation.
   * 
   * @return List of image file types. Strings are standard file extensions.
   */    
  public String[] getKnownFileTypes();

  /** Loads an image file into the Object.
   * 
   * @param f Image File.
   * @throws FileOpException Exception thrown if any error occurs.
   */
  public void loadImage(File f) throws FileOpException;

  /** Writes the current image to a ServletResponse.
   *
   * The image is encoded to the mime-type <code>mt</code> and sent to the output
   * stream of the <code>ServletResponse</code> <code>res</code>.
   *
   * Currently only mime-types "image/jpeg" and "image/png" are supported.
   * 
   * @param mt mime-type of the image to be sent.
   * @param res ServletResponse where the image is sent.
   * @throws FileOpException Exception thrown on any error.
   */
  public void writeImage(String mt, ServletResponse res) throws FileOpException;

  /** The width of the current image in pixel.
   * 
   * @return Image width in pixels.
   */
  public int getWidth();
  
  /** The height of the current image in pixel.
   * 
   * @return Image height in pixels.
   */  
  public int getHeight();

  /** Crops and scales the current image.
   *
   * The current image is cropped to a rectangle of <code>width</code>,
   * <code>height</code> at position <code>x_off</code>, <code>y_off</code>. The
   * resulting image is scaled by the factor <code>scale</code> using the
   * interpolation quality <code>qual</code> (0=worst).
   * 
   * @param x_off x offset of the crop rectangle in pixel.
   * @param y_off y offset of the crop rectangle in pixel.
   * @param width width of the crop rectangle in pixel.
   * @param height height of the crop rectangle in pixel.
   * @param scale scaling factor.
   * @param qual interpolation quality (0=worst).
   * @throws ImageOpException exception thrown on any error.
   */
  public void cropAndScale(
                int x_off, int y_off,
                int width, int height,
                float scale, int qual) throws ImageOpException;
}
