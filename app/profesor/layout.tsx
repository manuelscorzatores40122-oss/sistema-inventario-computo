import TeacherWorkspace from '@/app/components/teacher/TeacherWorkspace';

export default function ProfesorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TeacherWorkspace>{children}</TeacherWorkspace>
  );
}
