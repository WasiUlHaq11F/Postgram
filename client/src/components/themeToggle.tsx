import { useTheme } from '../context/ThemeProvider';

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
     
    </button>
  );
}

export default ThemeToggle;
