/** Clinical MDR 模块入口 重定向到映射工作室 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MDRIndex = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/mdr/mapping-studio', { replace: true });
  }, [navigate]);

  return null;
};

export default MDRIndex;
