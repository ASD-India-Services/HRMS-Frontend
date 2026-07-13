import { useParams } from 'react-router-dom';
import { EmployeeForm } from './EmployeeForm';

export default function EmployeeEditPage() {
  const { id } = useParams<{ id: string }>();
  return <EmployeeForm employeeId={id} />;
}
