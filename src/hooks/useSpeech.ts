import { useEffect, useRef, useState } from 'react';
import sources from '../data/course-audio.json';
import { createCoursePlayer, type CoursePlayback } from '../utils/course-player';
const audioSources: Record<string, string> = sources;
export function useSpeech(lessonKey?: number) {
  const [state, setState] = useState<CoursePlayback>({ speaking: false, error: '' });
  const player = useRef<ReturnType<typeof createCoursePlayer> | null>(null);
  useEffect(() => {
    setState({ speaking: false, error: '' });
    player.current = createCoursePlayer(text => {
      const source = audioSources[text];
      return source ? import.meta.env.BASE_URL + source : undefined;
    }, setState);
    return () => { player.current?.dispose(); player.current = null; };
  }, [lessonKey]);
  return {
    ...state,
    speak: (text: string, rate = 0.85) => player.current?.speak(text, rate),
    stop: () => player.current?.stop(),
  };
}
