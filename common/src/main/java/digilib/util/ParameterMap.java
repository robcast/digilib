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

import digilib.conf.DigilibOption;


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
	 * Does not call initParams().
	 */
	public ParameterMap() {
		params = new HashMap<String, Parameter>();
		options = new OptionsSet();
	}

	/** Constructor with initial size.
     * Does not call initParams().
	 * @param size the size
	 */
	public ParameterMap(int size) {
		params = new HashMap<String, Parameter>(size);
		options = new OptionsSet();
	}

	/** Shallow copy constructor.
	 * Be warned that the maps are only cloned i.e. keys and values are shared!
	 * 
	 * @param pm other ParameterMap
	 * @return new ParameterMap
	 */
	@SuppressWarnings("unchecked")
	public static ParameterMap cloneInstance(ParameterMap pm) {
		ParameterMap newPm = new ParameterMap();
		// clone params to this map
		newPm.params = (HashMap<String, Parameter>) pm.params.clone();
		if (pm.options != null) {
		    newPm.options.setOptions(pm.options.getOptions().clone());
		}
		return newPm;
	}

	
	/** Creates new ParameterMap by merging Parameters from another ParameterMap.
	 * 
	 * @param pm other ParameterMap
	 * @return new ParameterMap
	 */
	public static ParameterMap getInstance(ParameterMap pm) {
		ParameterMap newPm = new ParameterMap();
        // TODO: initParams?
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
	 * @param key the key
	 * @return the Parameter
	 */
	public Parameter get(String key) {
		return params.get(key);
	}

	/** Get the value with the corresponding key.
	 * 
	 * Returns null if no element is associated with key.
	 * 
	 * @param key the key
	 * @return the value
	 */
	public Object getValue(String key) {
		Parameter p = params.get(key);
		return (p != null) ? p.getValue() : null;
	}
	
	/** Get the value with the corresponding key.
	 * 
	 * Returns empty string if no element is associated with key.
	 * 
	 * @param key the key
	 * @return the value
	 */
	public String getAsString(String key) {
		Parameter p = params.get(key);
		return (p != null) ? p.getAsString() : "";
	}

	/** Get the value with the corresponding key.
	 * 
	 * Returns 0 if no element is associated with key.
	 * 
	 * @param key the key
	 * @return the value
	 */
	public int getAsInt(String key) {
		Parameter p = params.get(key);
		return (p != null) ? p.getAsInt() : 0;
	}

	/** Get the value with the corresponding key.
	 * 
	 * Returns 0 if no element is associated with key.
	 * 
	 * @param key the key
	 * @return the value
	 */
	public float getAsFloat(String key) {
		Parameter p = params.get(key);
		return (p != null) ? p.getAsFloat() : 0f;
	}

	/** Get the value with the corresponding key.
	 * 
	 * Returns false if no element is associated with key.
	 * 
	 * @param key the key
	 * @return the value
	 */
	public boolean getAsBoolean(String key) {
		Parameter p = params.get(key);
		return (p != null) ? p.getAsBoolean() : false;
	}

    /** Get the value with the corresponding key.
     * 
     * Returns null if no element is associated with key.
     * 
     * @param key the key
     * @return the value
     */
    public File getAsFile(String key) {
        Parameter p = params.get(key);
        return (p != null) ? p.getAsFile() : null;
    }

	/** Returns if the Parameter's value has been set.
	 * 
	 * @param key the key
	 * @return if the value has been set
	 */
	public boolean hasValue(String key) {
		Parameter p = params.get(key);
		return (p != null) ? p.hasValue() : false;
	}
	
	/** Add the Parameter to the map with a certain key.
	 * 
	 * Returns the value that was previously associated with key. 
	 * 
	 * @param key the key
	 * @param val the value
	 * @return last Parameter
	 */
	public Parameter put(String key, Parameter val) {
		return params.put(key, val);
	}

	/** Add the Parameter val to the map, using val's name.
	 * 
	 * Returns the value that was previously associated with val's name. 
	 * 
	 * @param val the value
	 * @return last Parameter
	 */
	public Parameter put(Parameter val) {
		return params.put(val.getName(), val);
	}
	
	/** Add a new Parameter with name, default and value.
	 * 
	 * Returns the key that was previously associated with name. 
	 * 
	 * @param name the name
	 * @param def the default
	 * @param val the value
	 * @return last Parameter
	 */
	public Parameter newParameter(String name, Object def, Object val) {
		Parameter p = new Parameter(name, def, val);
		return params.put(name, p);
	}

	/** Add a new Parameter with name, default, value and type.
	 * 
	 * Returns the key that was previously associated with name. 
	 * 
	 * @param name the name
	 * @param def the default
	 * @param val the value
	 * @param type the type
	 * @return last Parameter
	 */
	public Parameter newParameter(String name, Object def, Object val, int type) {
		Parameter p = new Parameter(name, def, val, type);
		return params.put(name, p);
	}

	/** Set the value of an existing parameter.
	 * 
	 * Sets the value and returns true if the parameter exists.
	 * 
	 * @param key the key
	 * @param val the value
	 * @return true if the parameter exists.
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
	 * @param key the key
	 * @param val the value
	 * @return true if the parameter exists.
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
	 * @param key the key
	 * @param val the value
	 * @return true if the parameter exists.
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
	 * @param key the key
	 * @param val the value
	 * @return true if the parameter exists.
	 */
	public boolean setValueFromString(String key, String val) {
		Parameter p = params.get(key);
		if (p != null) {
			p.setValueFromString(val);
			return true;
		}
		return false;
	}
	
	/** 
	 * Returns if the option has been set.
	 * @param opt the option
	 * @return true if the option has been set.
	 */
	public boolean hasOption(DigilibOption opt) {
		return options.hasOption(opt);
	}

	/**
	 * Returns a map with all Parameters of a type.
	 * @param type the type
	 * @return map with all Parameters of a type
	 */
	public HashMap<String, Parameter> getParameters(int type) {
	    HashMap<String, Parameter> map = new HashMap<String, Parameter>();
	    for (String k : params.keySet()) {
	        Parameter p = params.get(k);
	        if (p.getType() == type) {
	            map.put(k, p);
	        }
	    }
	    return map;
	}
	
	/**
	 * Returns the parameter Map.
	 * @return the parameter Map 
	 */
	public HashMap<String, Parameter> getParams() {
		return params;
	}

    /**
     * Sets the parameter Map.
	 * @param params the parameter Map
	 */
	public void setParams(HashMap<String, Parameter> params) {
		this.params = params;
	}

	/**
	 * Returns the options Set.
	 * @return the options Set
	 */
	public OptionsSet getOptions() {
		return options;
	}

	/**
	 * Sets the options Set.
	 * @param options the options Set
	 */
	public void setOptions(OptionsSet options) {
		this.options = options;
	}
}
