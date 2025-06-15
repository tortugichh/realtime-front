import { useState, useRef } from 'react';

function Chat() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [messages, setMessages] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mpeg' });
        setAudioBlob(audioBlob);
        sendAudioToBackend(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access to use this feature.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToBackend = async (blob) => {
    const formData = new FormData();
    formData.append('audio_file', blob, 'audio.mpeg');

    setMessages((prevMessages) => [...prevMessages, { type: 'user', content: 'Sending audio...' }]);

    try {
      const response = await fetch('https://realtime-vz2q.onrender.com/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const audioContent = data.audio_content;
      const audioUrl = `data:audio/mpeg;base64,${audioContent}`;

      setMessages((prevMessages) => [
        ...prevMessages,
        { type: 'ai', content: '', audioUrl: audioUrl },
      ]);
      playAudio(audioUrl);
    } catch (error) {
      console.error('Error sending audio to backend:', error);
      setMessages((prevMessages) => [...prevMessages, { type: 'error', content: `Error: ${error.message}` }]);
    }
  };

  const playAudio = (audioUrl) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  return (
    <div className="chat-container">
      <div className="messages-display">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            {msg.type === 'user' && <p>{msg.content}</p>}
            {msg.type === 'ai' && msg.audioUrl && (
              <button onClick={() => playAudio(msg.audioUrl)}>Play AI Response</button>
            )}
            {msg.type === 'error' && <p className="error-message">{msg.content}</p>}
          </div>
        ))}
      </div>
      <div className="controls">
        <button onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        {audioBlob && !isRecording && (
          <button onClick={() => playAudio(URL.createObjectURL(audioBlob))}>Play My Recording</button>
        )}
      </div>
    </div>
  );
}

export default Chat;