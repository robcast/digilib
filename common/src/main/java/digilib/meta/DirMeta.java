/**
 * 
 */
package digilib.meta;

import digilib.io.DocuDirectory;

/**
 * @author casties
 *
 */
public interface DirMeta {

    public boolean isChecked();

    public void readMeta(DocuDirectory docuDirectory);

    public void checkMeta(DocuDirectory docuDirectory);

    public MetadataMap getDirMeta();

    public void setDirMeta(MetadataMap dirMeta);

}
