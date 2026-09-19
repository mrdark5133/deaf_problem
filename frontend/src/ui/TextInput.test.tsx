import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TextInput } from './TextInput';
import { TextSource } from '../speech/TextSource';

describe('TextInput', () => {
  it('emits typed text on form submit and clears input', () => {
    const textSource = new TextSource();
    const emitSpy = vi.spyOn(textSource, 'emitTyped');
    const onSubmit = vi.fn();

    render(<TextInput textSource={textSource} onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox', { name: /input text to translate into asl/i });
    const sendBtn = screen.getByRole('button', { name: /send sentence/i });

    fireEvent.change(input, { target: { value: 'Good morning' } });
    expect(input).toHaveValue('Good morning');

    fireEvent.click(sendBtn);

    expect(emitSpy).toHaveBeenCalledWith('Good morning');
    expect(onSubmit).toHaveBeenCalledWith('Good morning');
    expect(input).toHaveValue('');
  });

  it('submits on Enter key press', () => {
    const textSource = new TextSource();
    const emitSpy = vi.spyOn(textSource, 'emitTyped');

    render(<TextInput textSource={textSource} />);

    const input = screen.getByRole('textbox', { name: /input text to translate into asl/i });

    fireEvent.change(input, { target: { value: 'Need help please' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(emitSpy).toHaveBeenCalledWith('Need help please');
    expect(input).toHaveValue('');
  });

  it('does not emit when input is empty or whitespace only', () => {
    const textSource = new TextSource();
    const emitSpy = vi.spyOn(textSource, 'emitTyped');

    render(<TextInput textSource={textSource} />);

    const input = screen.getByRole('textbox', { name: /input text to translate into asl/i });
    fireEvent.change(input, { target: { value: '    ' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(emitSpy).not.toHaveBeenCalled();
  });
});
