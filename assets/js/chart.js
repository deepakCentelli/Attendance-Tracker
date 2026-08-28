const ChartRenderer = {
    draw(canvasId, percentage, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 12;
        const lineWidth = 11;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background circle (gray)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#212528';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Draw progress arc
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (2 * Math.PI * (Math.min(percentage, 100) / 100));
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = color || '#B4FE61';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
};
