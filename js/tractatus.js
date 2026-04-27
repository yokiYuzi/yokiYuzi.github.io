/**
 * tractatus.js — Wittgenstein Tractatus Logico-Philosophicus quote engine
 * Displays a random proposition on page load; rotates on canvas click.
 */
(function () {
  'use strict';

  var QUOTES = [
    {
      num: '§ 1',
      de:  'Die Welt ist alles, was der Fall ist.',
      zh:  '世界是一切发生的事情。'
    },
    {
      num: '§ 1.1',
      de:  'Die Welt ist die Gesamtheit der Tatsachen, nicht der Dinge.',
      zh:  '世界是事实的总体，而非事物的总体。'
    },
    {
      num: '§ 1.13',
      de:  'Die Tatsachen im logischen Raum sind die Welt.',
      zh:  '逻辑空间中的事实就是世界。'
    },
    {
      num: '§ 1.2',
      de:  'Die Welt zerfällt in Tatsachen.',
      zh:  '世界分解为诸事实。'
    },
    {
      num: '§ 2',
      de:  'Was der Fall ist, die Tatsache, ist das Bestehen von Sachverhalten.',
      zh:  '发生的事情，即事实，就是诸事态的存在。'
    },
    {
      num: '§ 2.1',
      de:  'Wir machen uns Bilder der Tatsachen.',
      zh:  '我们给自己构造事实的图像。'
    },
    {
      num: '§ 2.12',
      de:  'Das Bild ist ein Modell der Wirklichkeit.',
      zh:  '图像是现实的模型。'
    },
    {
      num: '§ 2.141',
      de:  'Das Bild ist eine Tatsache.',
      zh:  '图像是一个事实。'
    },
    {
      num: '§ 2.19',
      de:  'Das logische Bild kann die Welt abbilden.',
      zh:  '逻辑图像能够描绘世界。'
    },
    {
      num: '§ 2.21',
      de:  'Das Bild stimmt mit der Wirklichkeit überein oder nicht; es ist richtig oder unrichtig, wahr oder falsch.',
      zh:  '图像与现实相符或不符；它是正确的或不正确的，真的或假的。'
    },
    {
      num: '§ 2.225',
      de:  'Es gibt kein a priori wahres Bild.',
      zh:  '不存在先天为真的图像。'
    },
    {
      num: '§ 3',
      de:  'Das logische Bild der Tatsachen ist der Gedanke.',
      zh:  '事实的逻辑图像就是思想。'
    },
    {
      num: '§ 3.01',
      de:  'Die Gesamtheit der wahren Gedanken sind ein Bild der Welt.',
      zh:  '所有真思想的总体是世界的一幅图像。'
    },
    {
      num: '§ 3.1',
      de:  'Im Satz drückt sich der Gedanke sinnlich wahrnehmbar aus.',
      zh:  '在命题中，思想以感官可知觉的方式表达出来。'
    },
    {
      num: '§ 3.2',
      de:  'Im Satze kann der Gedanke so ausgedrückt sein, dass den Gegenständen des Gedankens Elemente des Satzzeichens entsprechen.',
      zh:  '在命题中，思想得以表达，使得思想对象与命题符号的要素相对应。'
    },
    {
      num: '§ 4',
      de:  'Der Gedanke ist der sinnvolle Satz.',
      zh:  '思想就是有意义的命题。'
    },
    {
      num: '§ 4.01',
      de:  'Der Satz ist ein Bild der Wirklichkeit. Der Satz ist ein Modell der Wirklichkeit, so wie wir sie uns denken.',
      zh:  '命题是现实的图像。命题是我们所思考的那样的现实的模型。'
    },
    {
      num: '§ 4.022',
      de:  'Der Satz zeigt seinen Sinn. Der Satz zeigt, wie es sich verhält, wenn er wahr ist.',
      zh:  '命题显示其意义。命题显示，当它为真时，事情是怎样的。'
    },
    {
      num: '§ 4.111',
      de:  'Die Philosophie ist keine der Naturwissenschaften.',
      zh:  '哲学不是自然科学之一。'
    },
    {
      num: '§ 4.112',
      de:  'Der Zweck der Philosophie ist die logische Klärung der Gedanken.',
      zh:  '哲学的目的是思想的逻辑澄清。'
    },
    {
      num: '§ 4.114',
      de:  'Sie soll das Denkbare abgrenzen und damit das Undenkbare.',
      zh:  '哲学应当划定可思者的界限，从而也就划定不可思者的界限。'
    },
    {
      num: '§ 4.116',
      de:  'Alles was überhaupt gedacht werden kann, kann klar gedacht werden. Alles, was sich aussprechen lässt, lässt sich klar aussprechen.',
      zh:  '凡是能够被思考的，都能够被清楚地思考。凡是能够被说出的，都能够被清楚地说出。'
    },
    {
      num: '§ 4.12',
      de:  'Der Satz kann die gesamte Wirklichkeit darstellen, aber er kann nicht das darstellen, was er mit der Wirklichkeit gemein haben muss, um sie darstellen zu können — die logische Form.',
      zh:  '命题能够描述全部现实，但它不能描述它与现实所必须共有的东西——逻辑形式。'
    },
    {
      num: '§ 4.121',
      de:  'Was sich in der Sprache ausdrückt, können wir nicht durch sie ausdrücken.',
      zh:  '在语言中表达自身的东西，我们无法通过语言来表达。'
    },
    {
      num: '§ 5.6',
      de:  'Die Grenzen meiner Sprache bedeuten die Grenzen meiner Welt.',
      zh:  '我的语言的界限意味着我的世界的界限。'
    },
    {
      num: '§ 5.621',
      de:  'Die Welt und das Leben sind Eins.',
      zh:  '世界与生命是同一的。'
    },
    {
      num: '§ 5.63',
      de:  'Ich bin meine Welt. (Der Mikrokosmos.)',
      zh:  '我就是我的世界。（小宇宙。）'
    },
    {
      num: '§ 5.632',
      de:  'Das Subjekt gehört nicht zur Welt, sondern es ist eine Grenze der Welt.',
      zh:  '主体不属于世界，它是世界的界限。'
    },
    {
      num: '§ 5.64',
      de:  'Hier sieht man, dass der Solipsismus streng durchgeführt mit dem reinen Realismus zusammenfällt.',
      zh:  '这里可以看出，严格贯彻的唯我论与纯粹的实在论殊途同归。'
    },
    {
      num: '§ 6.13',
      de:  'Die Logik ist keine Lehre, sondern ein Spiegelbild der Welt.',
      zh:  '逻辑不是一种学说，而是世界的映像。'
    },
    {
      num: '§ 6.41',
      de:  'Der Sinn der Welt muss außerhalb ihrer liegen.',
      zh:  '世界的意义必在世界之外。'
    },
    {
      num: '§ 6.421',
      de:  'Es ist klar, dass sich die Ethik nicht aussprechen lässt. Ethik und Ästhetik sind Eins.',
      zh:  '伦理学显然不能被说出。伦理学与美学是同一的。'
    },
    {
      num: '§ 6.43',
      de:  'Die Welt des Glücklichen ist eine andere als die des Unglücklichen.',
      zh:  '幸福者的世界不同于不幸者的世界。'
    },
    {
      num: '§ 6.4311',
      de:  'Der Tod ist kein Ereignis des Lebens. Den Tod erlebt man nicht.',
      zh:  '死亡不是生命中的事件。人不经历死亡。'
    },
    {
      num: '§ 6.4312',
      de:  'Wenn man unter Ewigkeit nicht unendliche Zeitdauer, sondern Unzeitlichkeit versteht, dann lebt der, der in der Gegenwart lebt, ewig.',
      zh:  '若将永恒理解为非时间性而非无限的时间延续，则活在当下者便永恒地活着。'
    },
    {
      num: '§ 6.44',
      de:  'Nicht wie die Welt ist, ist das Mystische, sondern dass sie ist.',
      zh:  '神秘之处不在于世界是怎样的，而在于它是存在的。'
    },
    {
      num: '§ 6.45',
      de:  'Die Anschauung der Welt sub specie aeterni ist ihre Anschauung als begrenztes — ganzes — Ganzes.',
      zh:  '从永恒的角度来看待世界，就是把它看作一个有界限的整体。'
    },
    {
      num: '§ 6.5',
      de:  'Zu einer Antwort, die man nicht aussprechen kann, kann man auch die Frage nicht aussprechen.',
      zh:  '对于不能被说出的答案，相应的问题也不能被说出。'
    },
    {
      num: '§ 6.521',
      de:  'Die Lösung des Problems des Lebens merkt man am Verschwinden dieses Problems.',
      zh:  '生命问题的解决，体现在这个问题的消失之中。'
    },
    {
      num: '§ 6.522',
      de:  'Es gibt allerdings Unaussprechliches. Dies zeigt sich, es ist das Mystische.',
      zh:  '确实存在不可言说之物。它显现自身，这就是神秘之事。'
    },
    {
      num: '§ 6.54',
      de:  'Meine Sätze erläutern dadurch, dass sie der, welcher mich versteht, am Ende als unsinnig erkennt.',
      zh:  '我的命题以这样的方式阐明：理解我的人最终认识到它们是无意义的。'
    },
    {
      num: '§ 7',
      de:  'Wovon man nicht sprechen kann, darüber muss man schweigen.',
      zh:  '对于不可言说之物，必须保持沉默。'
    }
  ];

  var lastIdx = -1;

  function pickQuote() {
    var idx;
    do { idx = Math.floor(Math.random() * QUOTES.length); } while (idx === lastIdx);
    lastIdx = idx;
    return QUOTES[idx];
  }

  function renderQuote(q) {
    var elNum = document.getElementById('tractatus-num');
    var elDe  = document.getElementById('tractatus-de');
    var elZh  = document.getElementById('tractatus-zh');
    if (!elNum || !elDe || !elZh) return;

    /* Remove then re-add fade class to restart animation */
    [elNum, elDe, elZh].forEach(function (el) {
      el.classList.remove('tractatus-fade');
      void el.offsetWidth; /* force reflow */
      el.classList.add('tractatus-fade');
    });

    elNum.textContent = q.num;
    elDe.textContent  = q.de;
    elZh.textContent  = q.zh;
  }

  function init() {
    renderQuote(pickQuote());

    var canvas = document.getElementById('iso-canvas');
    if (canvas) {
      canvas.addEventListener('click', function () {
        renderQuote(pickQuote());
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
