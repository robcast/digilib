package digilib.util;

/*
 * #%L
 * ParameterMap.java -- HashMap of Parameters.
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2003 - 2013 MPIWG Berlin
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
 * Author: Robert Casties (robcast@berlios.de)
 * Created on 02.09.2003 by casties
 */

import java.io.File;
import java.util.HashMap;


/** HashMap of digilib.servlet.Parameter's.
 * 
 * Keys are Strings. Values are Parameters.
 * 
 * @author casties
 *
 */
public class ParameterMap {

	protected HashMap<String, Parameter> params;
	
	protected OptionsSet options;
	
	/** Default constructor.
	 * 
	 */
	public ParameterMap() {
		params = new HashMap<String, Parameter>();
		options = new OptionsSet();
		initParams();
	}

	/** Constructor with initial size.
	 * @param size
	 */
	public ParameterMap(int size) {
		params = new HashMap<String, Parameter>(size);
		options = new OptionsSet();
		initParams();
	}

	/** Shallow copy constructor.
	 * Be warned that the maps are only cloned i.e. keys and values are shared!
	 * @param pm
	 */
	@SuppressWarnings("unchecked")
	public static ParameterMap cloneInstance(ParameterMap pm) {
		ParameterMap newPm = new ParameterMap();
		// clone params to this map
		newPm.params = (HashMap<String, Parameter>) pm.params.clone();
		newPm.options = (OptionsSet) pm.options.clone();
		return newPm;
	}

	
	/** Creates new ParameterMap by merging Parameters from another ParameterMap.
	 * @param pm
	 * @return
	 */
	public static ParameterMap getInstance(ParameterMap pm) {
		ParameterMap newPm = new ParameterMap();
		// add all params to this map
		newPm.params.putAll(pm.params);
		newPm.initOptions();
		return newPm;
	}
	
	/** set up parameters
	 * 
	 */
	protected void initParams() {
		// no default parameters
	}
	
	/** set up options
	 * 
	 */
	protected void initOptions() {
		// no default options
	}
	
	/** Get the Parameter with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key
	 * @return
	 */
	public Parameter get(String key) {
		return params.get(key);
	}

	/** Get the Parameter with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key
	 * @return
	 */
	public Object getValue(String key) {
		Parameter p = params.get(key);
		return (p != null) ? p.getValue() : null;
	}
	
	/** Get the Parameter with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key
	 * @return
	 */
	public String getAsString(String key) {
		Parameter p = params.get(key);
		return (p != null) ? p.getAsString() : "";
	}

	/** Get the Parameter with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key
	 * @return
	 */
	public int getAsInt(String key) {
		Parameter p = params.get(key);
		return (p != null) ? p.getAsInt() : 0;
	}

	/** Get the Parameter with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key
	 * @return
	 */
	public float getAsFloat(String key) {
		Parameter p = params.get(key);
		return (p != null) ? p.getAsFloat() : 0f;
	}

	/** Get the Parameter with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key
	 * @return
	 */
	public boolean getAsBoolean(String key) {
		Parameter p = params.get(key);
		return (p != null) ? p.getAsBoolean() : false;
	}

    /** Get the Parameter with the corresponding key.
     * 
     * Returns null if no element is associated with key.
     * 
     * @param key
     * @return
     */
    public File getAsFile(String key) {
        Parameter p = params.get(key);
        return (p != null) ? p.getAsFile() : null;
    }

	/** Returns if the Parameter's value has been set.
	 * 
	 * @param key
	 * @return
	 */
	public boolean hasValue(String key) {
		Parameter p = params.get(key);
		return (p != null) ? p.hasValue() : false;
	}
	
	/** Add the Parameter to the map with a certain key.
	 * 
	 * Returns the value that was previously associated with key. 
	 * 
	 * @param key
	 * @param val
	 * @return
	 */
	public Parameter put(String key, Parameter val) {
		return params.put(key, val);
	}

	/** Add the Parameter val to the map, using val's name.
	 * 
	 * Returns the value that was previously associated with val's name. 
	 * 
	 * @param val
	 * @return
	 */
	public Parameter put(Parameter val) {
		return params.put(val.getName(), val);
	}
	
	/** Add a new Parameter with name, default and value.
	 * 
	 * Returns the key that was previously associated with name. 
	 * 
	 * @param name
	 * @param def
	 * @param val
	 * @return
	 */
	public Parameter newParameter(String name, Object def, Object val) {
		Parameter p = new Parameter(name, def, val);
		return params.put(name, p);
	}

	/** Add a new Parameter with name, default, value and type.
	 * 
	 * Returns the key that was previously associated with name. 
	 * 
	 * @param name
	 * @param def
	 * @param val
	 * @param type
	 * @return
	 */
	public Parameter newParameter(String name, Object def, Object val, int type) {
		Parameter p = new Parameter(name, def, val, type);
		return params.put(name, p);
	}

	/** Set the value of an existing parameter.
	 * 
	 * Sets the value and returns true if the parameter exists.
	 * 
	 * @param key
	 * @param val
	 * @return
	 */
	public boolean setValue(String key, Object val) {
		Parameter p = params.get(key);
		if (p != null) {
			p.setValue(val);
			return true;
		}
		return false;
	}

	/** Set the value of an existing parameter.
	 * 
	 * Sets the value and returns true if the parameter exists.
	 * 
	 * @param key
	 * @param val
	 * @return
	 */
	public boolean setValue(String key, int val) {
		Parameter p = params.get(key);
		if (p != null) {
			p.setValue(val);
			return true;
		}
		return false;
	}

	/** Set the value of an existing parameter.
	 * 
	 * Sets the value and returns true if the parameter exists.
	 * 
	 * @param key
	 * @param val
	 * @return
	 */
	public boolean setValue(String key, float val) {
		Parameter p = params.get(key);
		if (p != null) {
			p.setValue(val);
			return true;
		}
		return false;
	}

	/** Set the value of an existing parameter.
	 * 
	 * Sets the value and returns true if the parameter exists.
	 * 
	 * @param key
	 * @param val
	 * @return
	 */
	public boolean setValueFromString(String key, String val) {
		Parameter p = params.get(key);
		if (p != null) {
			p.setValueFromString(val);
			return true;
		}
		return false;
	}
	
	/** Returns of the option has been set.
	 * @param opt
	 * @return
	 */
	public boolean hasOption(String opt) {
		return options.hasOption(opt);
	}

	public HashMap<String, Parameter> getParams() {
		return params;
	}

	public void setParams(HashMap<String, Parameter> params) {
		this.params = params;
	}

	public OptionsSet getOptions() {
		return options;
	}

	public void setOptions(OptionsSet options) {
		this.options = options;
	}
}
