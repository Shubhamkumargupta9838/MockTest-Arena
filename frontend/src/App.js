import React from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ExamPage from './pages/ExamPage';
import TestListPage from './pages/TestListPage';
import TakeTestPage from './pages/TakeTestPage';
import ResultPage from './pages/ResultPage';
import CreateTestPage from './pages/CreateTestPage';
import LoginPage from './pages/LoginPage';
import UserAuthPage from './pages/UserAuthPage';
import AdminDashboard from './pages/AdminDashboard';
import NotFoundPage from './pages/NotFoundPage';
import TypingTest from './components/TypingTest/TypingTest';
import PaymentPage from './pages/PaymentPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pages with header/footer layout */}
        <Route element={<Layout />}>
          <Route path="/"                                       element={<HomePage />} />
          <Route path="/exams/:categorySlug"                    element={<CategoryPage />} />
          <Route path="/exams/:categorySlug/:examSlug"          element={<ExamPage />} />
          <Route path="/exams/:categorySlug/:examSlug/practice" element={<TestListPage mode="practice" />} />
          <Route path="/exams/:categorySlug/:examSlug/mock"     element={<TestListPage mode="mock" />} />
          <Route path="/results/:attemptId"                     element={<ResultPage />} />
          <Route path="/payment"                                element={<PaymentPage />} />
          <Route path="/user/login"                             element={<UserAuthPage mode="login" />} />
          <Route path="/user/register"                          element={<UserAuthPage mode="register" />} />
          <Route path="/admin/login"                            element={<LoginPage />} />
          <Route path="/admin/create-test"                      element={<CreateTestPage/>}/>
          <Route path="/admin/dashboard"                        element={<AdminDashboard />} />
          <Route path="/typing"                                 element={<TypingTest />} />
          <Route path="*"                                       element={<NotFoundPage />} />
        </Route>

        {/* Full-screen test - no layout */}
        <Route path="/quiz/attempt/:attemptId" element={<TakeTestPage />} />

        {/* /quiz/start/:slug → POST API → redirect */}
        <Route path="/quiz/start/:testSlug"    element={<StartTestRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

function StartTestRedirect() {
  const { testSlug } = useParams();
  React.useEffect(() => {
    fetch(`/api/quiz/start/${testSlug}`, { method: 'POST', credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.attemptId) window.location.replace(`/quiz/attempt/${data.attemptId}`);
        else window.location.replace('/');
      })
      .catch(() => window.location.replace('/'));
  }, [testSlug]);
  return <div className="loading-screen"><div className="spinner" /> Starting test…</div>;
}
