package digilib.meta;

/*-
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2001 - 2020 digilib Community
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 */

import digilib.io.DocuDirectory;

/**
 * Minimal DirMeta implementation just holding a MetadataMap.
 * 
 * @author casties
 *
 */
public class SimpleDirMeta implements DirMeta {

    protected MetadataMap meta = null;

    public SimpleDirMeta() {
        super();
        meta = new MetadataMap();
    }

    public SimpleDirMeta(MetadataMap meta) {
        super();
        this.meta = meta;
    }

    @Override
    public void readMeta(DocuDirectory dir) {
        // no implementation here
    }

    @Override
    public void checkMeta(DocuDirectory dir) {
        // no implementation here
    }

    @Override
    public MetadataMap getDirMeta() {
        return this.meta;
    }

    @Override
    public void setDirMeta(MetadataMap dirMeta) {
        this.meta = dirMeta;
    }

}
