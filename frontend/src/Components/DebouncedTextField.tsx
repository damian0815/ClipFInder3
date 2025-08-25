import {useEffect, useState} from "react";

type DebouncedTextFieldProps = {
    value: string;
    placeholder?: string;
    setDebouncedValue: (value: string) => void;
};

function DebouncedTextField(props: DebouncedTextFieldProps) {

  const [value, setValue] = useState<string>(props.value || '');

  useEffect(() => {
      const timeoutId = setTimeout(() => {
        props.setDebouncedValue(value);
      }, 500);
      return () => clearTimeout(timeoutId);
    }, [value]);


    return <>
          <input
          className={"w-full"} 
        type="text"
        placeholder={props.placeholder || "Search images..."}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </>

}

export default DebouncedTextField;
