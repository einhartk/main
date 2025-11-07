// Ultra fast scrolling to section
function scrollToSection(target) {
    $('html, body').stop().animate({
        scrollTop: $(target).offset().top
    }, 150); // Very fast scroll animation (150ms)
}

// Update active navigation on scroll
function updateActiveNav() {
    const scrollPosition = $(window).scrollTop();
    
    $('section').each(function() {
        const section = $(this);
        const sectionTop = section.offset().top - 100;
        const sectionHeight = section.outerHeight();
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            const id = section.attr('id');
            $('.nav-links a').removeClass('active');
            $(`.nav-links a[href="#${id}"]`).addClass('active');
        }
    });
}

// Initialize when the DOM is fully loaded
$(document).ready(function() {
    // Set section heights to viewport height
    $('section').css('min-height', $(window).height());
    
    // Handle navigation clicks
    $('.nav-links a').on('click', function(e) {
        e.preventDefault();
        const target = $(this).attr('href');
        scrollToSection(target);
        $('.nav-links, .hamburger').removeClass('active');
    });
    
    // Initialize hamburger menu
    $('.hamburger').on('click', function(e) {
        e.stopPropagation();
        $('.nav-links, .hamburger').toggleClass('active');
    });
    
    // Close menu when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.nav-links, .hamburger').length) {
            $('.nav-links, .hamburger').removeClass('active');
        }
    });
    
    // Prevent closing when clicking inside menu
    $('.nav-links').on('click', function(e) {
        e.stopPropagation();
    });
    
    // Smooth scroll for anchor links
    $('a[href^="#"]').on('click', function(e) {
        if ($(this).attr('href') !== '#') {
            e.preventDefault();
            const target = $(this).attr('href');
            scrollToSection(target);
        }
    });
    
    // Update active nav on scroll
    $(window).on('scroll', updateActiveNav);
    updateActiveNav(); // Initialize active nav
    
    // Contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('메시지가 전송되었습니다. 감사합니다!');
            contactForm.reset();
        });
    }
    
    // Handle scroll down button
    $('.scroll-down').on('click', function() {
        const currentSection = $(this).closest('section');
        const nextSection = currentSection.next('section');
        if (nextSection.length) {
            scrollToSection('#' + nextSection.attr('id'));
        }
    });
});
