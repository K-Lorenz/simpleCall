import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

const SplitInput = ({ value, onChangeText }) => {
  const inputs = Array(6).fill().map(() => useRef(null));

  const handleTextChange = (index, char) => {
    const newValue = value.split('');
    newValue[index] = char;
    onChangeText(newValue.join('').toUpperCase());

    if (char && index < inputs.length - 1) {
      inputs[index + 1].current.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      inputs[index - 1].current.focus();
    }
  };

  return (
    <View style={styles.splitContainer}>
      {Array(6).fill('').map((_, index) => (
        <TextInput
          key={index}
          ref={inputs[index]}
          style={styles.splitInput}
          value={value[index] || ''}
          maxLength={1}
          onChangeText={(char) => handleTextChange(index, char)}
          onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key)}
          autoCapitalize="characters"
          keyboardType="default"
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  splitContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  splitInput: {
    width: 30,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    textAlign: 'center',
    marginHorizontal: 5,
    fontSize: 18,
    fontFamily: 'monospace',
  },
});

export default SplitInput;
