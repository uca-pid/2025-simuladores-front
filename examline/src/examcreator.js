    import React from 'react';  
    import { useNavigate } from 'react-router-dom';
    
    function ExamCreator() {
    const navigate = useNavigate();

    return (
        <div>
        <h1>Hello, World!</h1>
        <p>This is the Exam page.</p>
        </div>
    );
    }

    export default ExamCreator;
