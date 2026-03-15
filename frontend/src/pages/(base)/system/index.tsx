/** System Governance 模块入口 重定向到用户管理 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SystemIndex = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/system/user-management', { replace: true });
  }, [navigate]);

  return null;
};

export default SystemIndex;
